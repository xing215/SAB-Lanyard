import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { databaseService } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const DatabaseManagement = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [exporting, setExporting] = useState(false);

	// Fetch database stats
	useEffect(() => {
		fetchStats();
	}, []);

	const fetchStats = async () => {
		try {
			setLoading(true);
			const data = await databaseService.getDatabaseStats();
			setStats(data);
		} catch (error) {
			console.error('Error fetching database stats:', error);
			toast.error(error.message || 'Lỗi khi lấy thống kê database');
		} finally {
			setLoading(false);
		}
	};

	const handleExportDatabase = async () => {
		try {
			const result = await Swal.fire({
				title: 'Xuất toàn bộ database?',
				html: `
					<div class="text-left">
						<p class="mb-3">Thao tác này sẽ xuất toàn bộ dữ liệu database thành file JSON bao gồm:</p>
						<ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
							<li>Người dùng (${stats?.collections?.users || 0} records)</li>
							<li>Sản phẩm (${stats?.collections?.products || 0} records)</li>
							<li>Đơn hàng (${stats?.collections?.orders || 0} records)</li>
							<li>Tài khoản (${stats?.collections?.accounts || 0} records)</li>
						</ul>
						<p class="mt-3 text-sm text-yellow-600">
							<i class="fas fa-exclamation-triangle mr-1"></i>
							Chỉ admin mới có quyền thực hiện thao tác này
						</p>
					</div>
				`,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: '<i class="fas fa-download mr-2"></i>Xuất Database',
				cancelButtonText: 'Hủy',
				confirmButtonColor: '#10b981',
				cancelButtonColor: '#6b7280'
			});

			if (result.isConfirmed) {
				setExporting(true);
				await databaseService.exportDatabase();
				toast.success('Database đã được xuất thành công!');
			}
		} catch (error) {
			console.error('Export error:', error);
			toast.error(error.message || 'Lỗi khi xuất database');
		} finally {
			setExporting(false);
		}
	};

	const handleImportDatabase = () => {
		// Create file input element
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (event) => {
			const file = event.target.files[0];
			if (!file) return;

			try {
				// Show confirmation dialog
				const result = await Swal.fire({
					title: 'Import Database?',
					html: `
						<div class="text-left">
							<p class="mb-3">Bạn đang chuẩn bị import dữ liệu từ file:</p>
							<div class="bg-gray-100 p-3 rounded mb-3">
								<p class="font-semibold">${file.name}</p>
								<p class="text-sm text-gray-600">Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
							</div>
							<div class="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
								<p class="text-sm text-yellow-800">
									<i class="fas fa-exclamation-triangle mr-2"></i>
									<strong>Cảnh báo:</strong>
								</p>
								<ul class="list-disc list-inside text-sm text-yellow-700 mt-1">
									<li>Dữ liệu trùng lặp sẽ được bỏ qua</li>
									<li>Quá trình này có thể mất vài phút</li>
									<li>Chỉ admin mới có quyền thực hiện</li>
								</ul>
							</div>
						</div>
					`,
					icon: 'warning',
					showCancelButton: true,
					confirmButtonText: '<i class="fas fa-upload mr-2"></i>Import',
					cancelButtonText: 'Hủy',
					confirmButtonColor: '#3b82f6',
					cancelButtonColor: '#6b7280'
				});

				if (result.isConfirmed) {
					setImporting(true);

					// Show progress toast
					const progressToast = toast.info('Đang import database...', {
						autoClose: false,
						closeButton: false
					});

					const response = await databaseService.importDatabase(file);

					// Close progress toast
					toast.dismiss(progressToast);

					// Show detailed results
					const totalImported = Object.values(response.results).reduce((sum, result) => sum + result.imported, 0);
					const totalSkipped = Object.values(response.results).reduce((sum, result) => sum + result.skipped, 0);
					const totalErrors = Object.values(response.results).reduce((sum, result) => sum + result.errors, 0);

					await Swal.fire({
						title: 'Import hoàn thành!',
						html: `
							<div class="text-left">
								<div class="grid grid-cols-3 gap-4 mb-4">
									<div class="text-center">
										<div class="text-2xl font-bold text-green-600">${totalImported}</div>
										<div class="text-sm text-gray-600">Imported</div>
									</div>
									<div class="text-center">
										<div class="text-2xl font-bold text-yellow-600">${totalSkipped}</div>
										<div class="text-sm text-gray-600">Skipped</div>
									</div>
									<div class="text-center">
										<div class="text-2xl font-bold text-red-600">${totalErrors}</div>
										<div class="text-sm text-gray-600">Errors</div>
									</div>
								</div>
								<div class="space-y-2 text-sm">
									${Object.entries(response.results).map(([collection, result]) =>
							`<div class="flex justify-between">
											<span class="capitalize">${collection}:</span>
											<span class="text-green-600">+${result.imported}</span>
										</div>`
						).join('')}
								</div>
							</div>
						`,
						icon: 'success',
						confirmButtonText: 'OK'
					});

					// Refresh stats
					await fetchStats();
				}
			} catch (error) {
				console.error('Import error:', error);
				toast.error(error.message || 'Lỗi khi import database');
			} finally {
				setImporting(false);
			}
		};

		input.click();
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Quản lý Database</h1>
				<p className="mt-2 text-gray-600">
					Xuất và nhập dữ liệu database. Chỉ dành cho quản trị viên.
				</p>
			</div>

			{/* Database Statistics */}
			<div className="bg-white rounded-lg shadow-md p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4 flex items-center">
					<i className="fas fa-chart-bar mr-2 text-blue-500"></i>
					Thống kê Database
				</h2>

				{stats && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-blue-50 p-4 rounded-lg">
							<div className="flex items-center">
								<i className="fas fa-users text-blue-500 text-xl mr-3"></i>
								<div>
									<p className="text-2xl font-bold text-blue-600">
										{stats.collections.users.toLocaleString()}
									</p>
									<p className="text-sm text-gray-600">Người dùng</p>
								</div>
							</div>
						</div>

						<div className="bg-green-50 p-4 rounded-lg">
							<div className="flex items-center">
								<i className="fas fa-box text-green-500 text-xl mr-3"></i>
								<div>
									<p className="text-2xl font-bold text-green-600">
										{stats.collections.products.toLocaleString()}
									</p>
									<p className="text-sm text-gray-600">Sản phẩm</p>
								</div>
							</div>
						</div>

						<div className="bg-yellow-50 p-4 rounded-lg">
							<div className="flex items-center">
								<i className="fas fa-shopping-cart text-yellow-500 text-xl mr-3"></i>
								<div>
									<p className="text-2xl font-bold text-yellow-600">
										{stats.collections.orders.toLocaleString()}
									</p>
									<p className="text-sm text-gray-600">Đơn hàng</p>
								</div>
							</div>
						</div>

						<div className="bg-purple-50 p-4 rounded-lg">
							<div className="flex items-center">
								<i className="fas fa-user-circle text-purple-500 text-xl mr-3"></i>
								<div>
									<p className="text-2xl font-bold text-purple-600">
										{stats.collections.accounts.toLocaleString()}
									</p>
									<p className="text-sm text-gray-600">Tài khoản</p>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="mt-4 text-sm text-gray-500">
					<i className="fas fa-clock mr-1"></i>
					Cập nhật lần cuối: {stats ? new Date(stats.lastUpdated).toLocaleString('vi-VN') : 'N/A'}
				</div>
			</div>

			{/* Database Operations */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<h2 className="text-xl font-semibold mb-4 flex items-center">
					<i className="fas fa-database mr-2 text-gray-700"></i>
					Thao tác Database
				</h2>

				<div className="grid md:grid-cols-2 gap-6">
					{/* Export Database */}
					<div className="border border-gray-200 rounded-lg p-6">
						<div className="flex items-center mb-4">
							<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
								<i className="fas fa-download text-green-600 text-xl"></i>
							</div>
							<div>
								<h3 className="font-semibold text-gray-900">Xuất Database</h3>
								<p className="text-sm text-gray-600">Tải xuống toàn bộ dữ liệu</p>
							</div>
						</div>

						<p className="text-sm text-gray-600 mb-4">
							Xuất toàn bộ dữ liệu database thành file JSON. Bao gồm tất cả users, products, orders và accounts.
						</p>

						<button
							onClick={handleExportDatabase}
							disabled={exporting}
							className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
								text-white font-medium py-2 px-4 rounded-lg transition-colors
								flex items-center justify-center"
						>
							{exporting ? (
								<>
									<LoadingSpinner size="small" className="mr-2" />
									Đang xuất...
								</>
							) : (
								<>
									<i className="fas fa-download mr-2"></i>
									Xuất Database
								</>
							)}
						</button>
					</div>

					{/* Import Database */}
					<div className="border border-gray-200 rounded-lg p-6">
						<div className="flex items-center mb-4">
							<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
								<i className="fas fa-upload text-blue-600 text-xl"></i>
							</div>
							<div>
								<h3 className="font-semibold text-gray-900">Nhập Database</h3>
								<p className="text-sm text-gray-600">Import dữ liệu từ file JSON</p>
							</div>
						</div>

						<p className="text-sm text-gray-600 mb-4">
							Import dữ liệu từ file JSON đã xuất trước đó. Dữ liệu trùng lặp sẽ được bỏ qua.
						</p>

						<button
							onClick={handleImportDatabase}
							disabled={importing}
							className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
								text-white font-medium py-2 px-4 rounded-lg transition-colors
								flex items-center justify-center"
						>
							{importing ? (
								<>
									<LoadingSpinner size="small" className="mr-2" />
									Đang nhập...
								</>
							) : (
								<>
									<i className="fas fa-upload mr-2"></i>
									Nhập Database
								</>
							)}
						</button>
					</div>
				</div>

				{/* Security Notice */}
				<div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<div className="flex items-start">
						<i className="fas fa-shield-alt text-yellow-600 mt-1 mr-3"></i>
						<div>
							<h4 className="font-medium text-yellow-800 mb-1">Bảo mật</h4>
							<p className="text-sm text-yellow-700">
								Các thao tác này chỉ dành cho quản trị viên và được bảo vệ bởi Better-Auth.
								Dữ liệu được xử lý an toàn với MongoDB transactions để đảm bảo tính toàn vẹn.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DatabaseManagement;
